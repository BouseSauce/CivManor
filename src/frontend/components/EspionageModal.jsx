import React, { useState, useEffect } from 'react';
import { GameClient } from '../api/client';

export default function EspionageModal({ isOpen, onClose, targetAreaId, targetName }) {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && targetAreaId) {
      loadIntel();
    }
  }, [isOpen, targetAreaId]);

  const loadIntel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await GameClient.getIntel(targetAreaId);
      setIntel(res);
    } catch (e) {
      setError(e.message || 'Failed to gather intelligence.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const CensoredRow = ({ label, value, isCensored }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <span style={{ fontWeight: 600 }}>{label}:</span>
      {isCensored ? (
        <span style={{ background: '#000', color: '#000', padding: '0 4px', borderRadius: 2, userSelect: 'none' }}>XXXXXX</span>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="medieval-panel" style={{ width: '450px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Intelligence Report: {targetName || targetAreaId}</span>
          <button className="btn btn-small" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div className="panel-body" style={{ padding: 20, background: 'var(--parchment)', color: 'var(--wood-dark)' }}>
          {loading && <div style={{ textAlign: 'center', padding: 20 }}>Gathering intelligence...</div>}
          {error && <div style={{ color: '#b71c1c', padding: 10, background: 'rgba(183, 28, 28, 0.1)', borderRadius: 4 }}>{error}</div>}
          
          {intel && (
            <div style={{ fontFamily: 'var(--font-body)' }}>
              <div style={{ 
                textAlign: 'center', 
                fontSize: '1.2rem', 
                fontWeight: 700, 
                marginBottom: 15, 
                textTransform: 'uppercase',
                borderBottom: '2px solid var(--wood-dark)',
                paddingBottom: 5
              }}>
                Intel Depth: {intel.depth}
              </div>

              {intel.depth === 'FAILED' ? (
                <div style={{ textAlign: 'center', padding: 20, fontStyle: 'italic' }}>
                  "Our spies were unable to penetrate their defenses. Some did not return."
                </div>
              ) : (
                <>
                  <section style={{ marginBottom: 20 }}>
                    <h4 style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 8 }}>Resource Stockpiles</h4>
                    <CensoredRow label="Food" value={Math.floor(intel.resources?.Food || 0)} isCensored={false} />
                    <CensoredRow label="Timber" value={Math.floor(intel.resources?.Timber || 0)} isCensored={false} />
                    <CensoredRow label="Stone" value={Math.floor(intel.resources?.Stone || 0)} isCensored={false} />
                    <CensoredRow label="Gold" value={Math.floor(intel.resources?.Gold || 0)} isCensored={false} />
                  </section>

                  <section style={{ marginBottom: 20 }}>
                    <h4 style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 8 }}>Infrastructure</h4>
                    {['TownHall', 'Barracks', 'ShadowGuild', 'Library'].map(bId => (
                      <CensoredRow 
                        key={bId} 
                        label={bId.replace(/([A-Z])/g, ' $1').trim()} 
                        value={`Level ${intel.buildings?.[bId] || 0}`} 
                        isCensored={intel.depth === 'BASIC'} 
                      />
                    ))}
                  </section>

                  <section>
                    <h4 style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', marginBottom: 8 }}>Garrison</h4>
                    {['Villager', 'Militia', 'Spearmen', 'Spy'].map(uType => (
                      <CensoredRow 
                        key={uType} 
                        label={uType} 
                        value={intel.units?.[uType] || 0} 
                        isCensored={intel.depth !== 'FULL'} 
                      />
                    ))}
                  </section>

                  <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={async () => {
                        try {
                          const resp = await GameClient.sendSpy(targetAreaId, window.gameState.activeAreaID);
                          alert(resp.message);
                          loadIntel();
                        } catch (e) {
                          alert('Failed to send spy: ' + e.message);
                        }
                      }}
                    >
                      <i className="fa-solid fa-user-secret" style={{ marginRight: 8 }}></i>
                      Send Infiltration Spy
                    </button>
                  </div>
                </>
              )}
              
              <div style={{ marginTop: 20, fontSize: '0.8rem', opacity: 0.6, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 10 }}>
                CONFIDENTIAL - FOR YOUR EYES ONLY
              </div>
            </div>
          )}
        </div>
        
        <div className="panel-footer" style={{ padding: 10, textAlign: 'right' }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
