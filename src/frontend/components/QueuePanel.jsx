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
    // use a stable identity key (including index) so timers follow items even if array order changes
    (queue || []).forEach((item, index) => {
      const key = `${item.areaId || item.areaName || parentAreaId || ''}:${item.type}:${item.id || item.name}:${index}`;
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

        // Identify active items per area (sequential processing for Buildings/Units)
        // Research is independent and always progresses.
        const activeKeys = new Set();
        const areaProcessed = new Set();

        (queue || []).forEach((item, index) => {
          const key = `${item.areaId || item.areaName || parentAreaId || ''}:${item.type}:${item.id || item.name}:${index}`;
          if (item.type === 'Research') {
            activeKeys.add(key);
          } else {
            const areaId = item.areaId || item.areaName || parentAreaId || 'default';
            if (!areaProcessed.has(areaId)) {
              activeKeys.add(key);
              areaProcessed.add(areaId);
            }
          }
        });

        Object.keys(next).forEach(k => {
          if (next[k] == null) return;
          if (activeKeys.has(k) && next[k] > 0) { 
            next[k] = next[k] - 1; 
            changed = true; 
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [queue]);

  // When an item reaches 0 seconds or 100% progress, trigger a single refresh to sync with server
  useEffect(() => {
    if (!onRefresh) return;
    let triggered = false;
    (queue || []).forEach((item, index) => {
      const key = `${item.areaId || item.areaName || parentAreaId || ''}:${item.type}:${item.id || item.name}:${index}`;
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
    const areaProcessed = new Set();

    (queue || []).forEach((item, index) => {
      // Use index in key to allow multiple upgrades of same building type in queue
      const k = `${item.areaId || item.areaName || parentAreaId || ''}:${item.type}:${item.id || item.name}:${index}`;
      
      const secs = (typeof secondsMap[k] !== 'undefined' && secondsMap[k] !== null)
        ? secondsMap[k]
        : (parseSeconds(item.secondsRemaining) ?? parseSeconds(item.timeRemainingSeconds) ?? parseSeconds(item.timeRemaining) ?? parseSeconds(item.seconds) ?? parseSeconds(item.ticksRemaining));
      
      const prog = (typeof item.totalTime === 'number' && secs != null)
        ? Math.max(0, Math.min(100, Math.floor(((item.totalTime - secs) / item.totalTime) * 100)))
        : (item.progress || 0);

      if ((secs === 0 && secs !== null) || prog >= 100) return;

      // Determine if this item is active in its area (sequential processing)
      let isActive = false;
      if (item.type === 'Research') {
        isActive = true;
      } else {
        const areaId = item.areaId || item.areaName || parentAreaId || 'default';
        if (!areaProcessed.has(areaId)) {
          isActive = true;
          areaProcessed.add(areaId);
        }
      }

      out.push(Object.assign({}, item, { __secs: secs, __prog: prog, __key: k, __isActive: isActive }));
    });
    return out;
  })();

  return (
    <div className="beveled-panel" style={{ marginBottom: '12px', padding: '12px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', minWidth: 'max-content' }}>
        {(!visibleQueue || visibleQueue.length === 0) ? (
          <div className="font-garamond" style={{ color: '#aaa', fontStyle: 'italic' }}>Nothing is currently in progress.</div>
        ) : (
          visibleQueue.map((item) => {
            const key = item.__key;
            const secs = item.__secs;
            const prog = item.__prog;
            const isResearch = item.type === 'Research';
            const isActive = item.__isActive;
            return (
              <div
                key={key}
                onClick={() => onItemClick && onItemClick(item)}
                className="standard-card"
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    cursor: onItemClick ? 'pointer' : 'default',
                    padding: '10px 14px',
                    background: isActive ? 'rgba(255,215,0,0.05)' : 'rgba(0,0,0,0.3)',
                    borderLeft: isResearch ? '4px solid #aaffaa' : '4px solid var(--accent-gold)',
                    borderTop: isActive ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                    width: '220px',
                    flexShrink: 0,
                    position: 'relative',
                    boxShadow: isActive ? '0 0 15px rgba(255,215,0,0.1)' : 'none'
                }}
              >
                {isActive && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-8px', 
                    right: '10px', 
                    background: 'var(--accent-gold)', 
                    color: '#000', 
                    fontSize: '0.65rem', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    Active
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <div style={{ width: '24px', textAlign: 'center' }}>
                    <i className={`fa-solid ${isResearch ? 'fa-flask' : (item.type === 'Unit' ? 'fa-person-military-pointing' : 'fa-hammer')}`} 
                       style={{ color: isResearch ? '#aaffaa' : 'var(--accent-gold)', fontSize: '1.1rem' }}></i>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className="font-cinzel" style={{ fontWeight: 700, color: '#e0cda0', fontSize: '0.85em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name || item.id}
                    </div>
                    <div className="font-garamond" style={{ fontSize: '0.8rem', color: '#ccc' }}>
                      {item.type} {item.count ? `(${item.count}x)` : ''}
                    </div>
                  </div>
                </div>
                
                <div style={{ width: '100%' }}>
                  {!isActive ? (
                    <div className="font-garamond" style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '8px 0', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '6px', opacity: 0.6 }}></i>
                      Queued
                    </div>
                  ) : (
                    <>
                      <div className="progress-bar-bg" style={{ height: '6px', background: '#111', border: '1px solid #333', borderRadius: '3px' }}>
                        <div className="progress-bar-fill" style={{ 
                            width: `${prog}%`, 
                            backgroundColor: isResearch ? '#4caf50' : 'var(--accent-green)', 
                            height: '100%',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <div className="font-garamond" style={{ fontSize: '0.75rem', color: '#999' }}>{secs != null ? humanTime(secs) : ''}</div>
                        <div className="font-garamond" style={{ fontSize: '0.75rem', color: '#bbb' }}>{prog}%</div>
                      </div>
                    </>
                  )}
                </div>
                
                <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
                  {(item.type === 'Unit' || item.type === 'Building') && (
                    <button className="btn-primary font-cinzel" style={{ fontSize: '0.7em', padding: '2px 6px', background: '#8b0000', borderColor: '#500', minHeight: 'auto' }} onClick={async (e) => {
                      e.stopPropagation();
                      const areaId = item.areaId || parentAreaId || null;
                      if (!areaId) { alert('Area context required to cancel this item'); return; }
                      if (!confirm('Cancel queued item and refund remaining resources?')) return;
                      try {
                        const resp = await GameClient.cancelUpgrade(areaId, item.id || item.name, item.type);
                        if (resp && resp.success) {
                          if (typeof onRefresh === 'function') onRefresh();
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
    </div>
  );
}
