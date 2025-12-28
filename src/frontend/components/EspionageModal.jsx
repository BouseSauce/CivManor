import React, { useState, useEffect } from 'react';
import { GameClient } from '../api/client';

export default function EspionageModal({ isOpen, onClose, targetAreaId, targetName, user, regions }) {
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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      padding: '8px 0', 
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      fontSize: '0.95rem'
    }}>
      <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{label}:</span>
      {isCensored ? (
        <span style={{ 
          background: '#000', 
          color: '#000', 
          padding: '0 8px', 
          borderRadius: 2, 
          userSelect: 'none',
          opacity: 0.5
        }}>XXXXXX</span>
      ) : (
        <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{value}</span>
      )}
    </div>
  );

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="medieval-panel" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '2px solid var(--accent-gold)' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--wood-medium)', borderBottom: '1px solid var(--accent-gold)' }}>
          <span className="font-cinzel" style={{ fontSize: '1.1rem' }}>Intelligence Report: {targetName || targetAreaId}</span>
          <button className="btn btn-small" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        
        <div className="panel-body" style={{ 
          padding: '25px', 
          background: 'var(--parchment)', 
          color: 'var(--text-main)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)'
        }}>
          {loading && <div style={{ textAlign: 'center', padding: 40 }}>
            <i className="fa-solid fa-magnifying-glass fa-spin" style={{ fontSize: '2.5rem', marginBottom: 15, display: 'block', color: 'var(--accent-gold)' }}></i>
            <div className="font-cinzel">Gathering intelligence...</div>
          </div>}
          {error && <div style={{ 
            color: '#b71c1c', 
            padding: 15, 
            background: 'rgba(183, 28, 28, 0.1)', 
            borderRadius: 4,
            border: '1px solid rgba(183, 28, 28, 0.2)',
            marginBottom: 15,
            fontSize: '0.9rem'
          }}>{error}</div>}
          
          {intel && (
            <div style={{ fontFamily: 'var(--font-body)' }}>
              <div className="font-cinzel" style={{ 
                textAlign: 'center', 
                fontSize: '1.4rem', 
                fontWeight: 700, 
                marginBottom: 10, 
                textTransform: 'uppercase',
                borderBottom: '2px solid var(--accent-gold)',
                paddingBottom: 8,
                color: 'var(--text-highlight)'
              }}>
                Intel Depth: {intel.depth}
              </div>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{ 
                  fontSize: '0.8rem', 
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  background: intel.lastInfiltration ? 'rgba(255, 215, 0, 0.1)' : 'rgba(46, 125, 50, 0.1)',
                  color: intel.lastInfiltration ? 'var(--text-highlight)' : 'var(--accent-green)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  border: '1px solid currentColor',
                  letterSpacing: '1px'
                }}>
                  {intel.lastInfiltration ? 'Historical Data' : 'Live Intel'}
                </span>
              </div>

              {intel.lastInfiltration && (
                <div style={{ 
                  textAlign: 'center', 
                  fontSize: '0.85rem', 
                  opacity: 0.9, 
                  marginBottom: 20,
                  fontStyle: 'italic',
                  color: 'var(--text-main)',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                  Report from: {new Date(intel.lastInfiltration).toLocaleString()}
                  {intel.originAreaId && <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.7 }}>Origin: {intel.originAreaId}</div>}
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-around', 
                marginBottom: 25, 
                padding: '15px', 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: 6,
                fontSize: '0.95rem',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Your Spy Level</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-highlight)', fontSize: '1.1rem' }}>{intel.attackerSpyLevel || 0}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', opacity: 0.4 }}>
                  <i className="fa-solid fa-vs" style={{ fontSize: '0.8rem' }}></i>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4 }}>Counter-Spy Level</div>
                  <div style={{ fontWeight: 800, color: intel.counterSpyLevel !== undefined ? 'var(--accent-red)' : '#555', fontSize: '1.1rem' }}>
                    {intel.counterSpyLevel !== undefined ? intel.counterSpyLevel : '??'}
                  </div>
                </div>
              </div>

              {intel.depth === 'FAILED' ? (
                <div style={{ textAlign: 'center', padding: 30, fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                  "Our spies were unable to penetrate their defenses. Some did not return."
                </div>
              ) : (
                <>
                  <section style={{ marginBottom: 30 }}>
                    <h4 className="font-cinzel" style={{ 
                      borderBottom: '1px solid rgba(197, 160, 89, 0.3)', 
                      marginBottom: 12,
                      color: 'var(--accent-gold)',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      paddingBottom: '4px'
                    }}>Resource Stockpiles</h4>
                    <CensoredRow label="Food" value={Math.floor(intel.resources?.Food || 0).toLocaleString()} isCensored={false} />
                    <CensoredRow label="Timber" value={Math.floor(intel.resources?.Timber || 0).toLocaleString()} isCensored={false} />
                    <CensoredRow label="Stone" value={Math.floor(intel.resources?.Stone || 0).toLocaleString()} isCensored={false} />
                    <CensoredRow label="Gold" value={Math.floor(intel.resources?.Gold || 0).toLocaleString()} isCensored={false} />
                  </section>

                  <section style={{ marginBottom: 30 }}>
                    <h4 className="font-cinzel" style={{ 
                      borderBottom: '1px solid rgba(197, 160, 89, 0.3)', 
                      marginBottom: 12,
                      color: 'var(--accent-gold)',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      paddingBottom: '4px'
                    }}>Infrastructure</h4>
                    {['TownHall', 'Barracks', 'Watchtower', 'Library'].map(bId => (
                      <CensoredRow 
                        key={bId} 
                        label={bId.replace(/([A-Z])/g, ' $1').trim()} 
                        value={`Level ${intel.buildings?.[bId] || 0}`} 
                        isCensored={intel.depth === 'BASIC'} 
                      />
                    ))}
                  </section>

                  <section style={{ marginBottom: 30 }}>
                    <h4 className="font-cinzel" style={{ 
                      borderBottom: '1px solid rgba(197, 160, 89, 0.3)', 
                      marginBottom: 12,
                      color: 'var(--accent-gold)',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      paddingBottom: '4px'
                    }}>Garrison</h4>
                    {['Villager', 'Militia', 'Spearmen', 'Spy'].map(uType => (
                      <CensoredRow 
                        key={uType} 
                        label={uType} 
                        value={intel.units?.[uType] || 0} 
                        isCensored={intel.depth !== 'FULL'} 
                      />
                    ))}
                  </section>
                </>
              )}
              
              <div style={{ marginTop: 25, fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, letterSpacing: '2px' }}>
                CONFIDENTIAL - FOR YOUR EYES ONLY
              </div>
            </div>
          )}
        </div>
        
        <div className="panel-footer" style={{ padding: '15px', textAlign: 'right', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button className="btn" onClick={onClose} style={{ minWidth: '100px' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
