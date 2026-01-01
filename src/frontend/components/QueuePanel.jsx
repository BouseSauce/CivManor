import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';

export default function QueuePanel({ queue = [], onRefresh, onItemClick, parentAreaId = null }) {
  const [secondsMap, setSecondsMap] = useState({});

  const parseSeconds = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return Math.max(0, Math.floor(v));
    if (typeof v === 'string') {
      const m = v.match(/(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  };

  useEffect(() => {
    // Initialize seconds map from incoming queue
    const next = {};
    // use a stable identity key (no index) so timers follow items even if array order changes
    (queue || []).forEach((item) => {
      const key = `${item.areaId || item.areaName || ''}:${item.type}:${item.id || item.name}`;
      // look for common time fields
      const secs = parseSeconds(item.secondsRemaining) ?? parseSeconds(item.timeRemainingSeconds) ?? parseSeconds(item.timeRemaining) ?? parseSeconds(item.seconds) ?? parseSeconds(item.ticksRemaining);
      next[key] = secs;
    });
    setSecondsMap(next);
  }, [queue]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsMap(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(k => {
          if (next[k] == null) return;
          if (next[k] > 0) { next[k] = next[k] - 1; changed = true; }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // When an item reaches 0 seconds or 100% progress, trigger a single refresh to sync with server
  useEffect(() => {
    if (!onRefresh) return;
    let triggered = false;
    (queue || []).forEach((item) => {
      const key = `${item.areaId || item.areaName || ''}:${item.type}:${item.id || item.name}`;
      const secs = (typeof secondsMap[key] !== 'undefined' && secondsMap[key] !== null)
        ? secondsMap[key]
        : (parseSeconds(item.secondsRemaining) ?? parseSeconds(item.timeRemainingSeconds) ?? parseSeconds(item.timeRemaining) ?? parseSeconds(item.seconds));
      const prog = (typeof item.totalTime === 'number' && secs != null) ? Math.max(0, Math.min(100, Math.floor(((item.totalTime - secs) / item.totalTime) * 100))) : (item.progress || 0);
      if ((secs === 0 && secs !== null) || prog >= 100) {
        if (!triggered) {
          triggered = true;
          // schedule one refresh shortly to allow UI to show 100% briefly
          setTimeout(() => { try { onRefresh(); } catch (e) {} }, 800);
        }
      }
    });
  }, [secondsMap, queue, onRefresh]);

  const humanTime = (s) => {
    if (s == null) return 'Unknown';
    const sec = Math.max(0, Math.floor(s));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const sRem = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sRem}s`;
    return `${sRem}s`;
  };

  // Precompute visible (deduped) queue items to simplify JSX and keep parsing stable
  const visibleQueue = (() => {
    const seen = new Set();
    const out = [];
    (queue || []).forEach((item) => {
      const k = `${item.areaId || item.areaName || ''}:${item.type}:${item.id || item.name}`;
      if (seen.has(k)) return;
      seen.add(k);
      const secs = (typeof secondsMap[k] !== 'undefined' && secondsMap[k] !== null)
        ? secondsMap[k]
        : (parseSeconds(item.secondsRemaining) ?? parseSeconds(item.timeRemainingSeconds) ?? parseSeconds(item.timeRemaining) ?? parseSeconds(item.seconds) ?? parseSeconds(item.ticksRemaining));
      const prog = (typeof item.totalTime === 'number' && secs != null)
        ? Math.max(0, Math.min(100, Math.floor(((item.totalTime - secs) / item.totalTime) * 100)))
        : (item.progress || 0);
      if ((secs === 0 && secs !== null) || prog >= 100) return;
      out.push(Object.assign({}, item, { __secs: secs, __prog: prog, __key: k }));
    });
    return out;
  })();

  return (
    <div className="beveled-panel" style={{ marginBottom: '12px', padding: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(!visibleQueue || visibleQueue.length === 0) ? (
          <div className="font-garamond" style={{ color: '#aaa', fontStyle: 'italic' }}>Nothing is currently in progress.</div>
        ) : (
          visibleQueue.map((item) => {
            const key = item.__key;
            const secs = item.__secs;
            const prog = item.__prog;
            const isResearch = item.type === 'Research';
            return (
              <div
                key={key}
                onClick={() => onItemClick && onItemClick(item)}
                className="standard-card"
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    gap: '12px', 
                    cursor: onItemClick ? 'pointer' : 'default',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderLeft: isResearch ? '4px solid #aaffaa' : '4px solid var(--accent-gold)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ width: '32px', textAlign: 'center' }}>
                    <i className={`fa-solid ${isResearch ? 'fa-flask' : (item.type === 'Unit' ? 'fa-person-military-pointing' : 'fa-hammer')}`} 
                       style={{ color: isResearch ? '#aaffaa' : 'var(--accent-gold)', fontSize: '1.2rem' }}></i>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="font-cinzel" style={{ fontWeight: 700, color: '#e0cda0', fontSize: '0.95em' }}>
                      {item.name || item.id}{item.areaName ? ` — ${item.areaName}` : ''}
                    </div>
                    <div className="font-garamond" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                      {item.type} {item.count ? `— ${item.count}x` : ''} {secs != null ? `— ${humanTime(secs)} remaining` : ''}
                    </div>
                  </div>
                </div>
                
                <div style={{ width: '140px' }}>
                  <div className="progress-bar-bg" style={{ height: '8px', background: '#222', border: '1px solid #444', borderRadius: '4px' }}>
                    <div className="progress-bar-fill" style={{ 
                        width: `${prog}%`, 
                        backgroundColor: isResearch ? '#4caf50' : 'var(--accent-green)', 
                        height: '100%',
                        borderRadius: '3px'
                    }} />
                  </div>
                  <div className="font-garamond" style={{ fontSize: '0.8rem', color: '#bbb', textAlign: 'right', marginTop: '4px' }}>{prog}%</div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {(item.type === 'Unit' || item.type === 'Building') && (
                    <button className="btn-primary font-cinzel" style={{ fontSize: '0.8em', padding: '4px 8px', background: '#8b0000', borderColor: '#500' }} onClick={async (e) => {
                      e.stopPropagation();
                      const areaId = item.areaId || parentAreaId || null;
                      if (!areaId) { alert('Area context required to cancel this item'); return; }
                      if (!confirm('Cancel queued item and refund remaining resources?')) return;
                      try {
                        const resp = await GameClient.cancelUpgrade(areaId, item.id || item.name, item.type);
                        if (resp && resp.success) {
                          if (typeof onRefresh === 'function') onRefresh();
                          alert('Cancelled. Resources refunded.');
                        } else {
                          alert((resp && resp.error) || 'Failed to cancel item');
                        }
                      } catch (err) {
                        console.error('Cancel queue item error', err);
                        alert(err && err.message ? err.message : 'Failed to cancel item');
                      }
                    }}>Cancel</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* footer removed: manual Refresh button removed per UX request */}
    </div>
  );
}
