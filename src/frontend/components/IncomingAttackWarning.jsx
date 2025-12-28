import React from 'react';
import { GameClient } from '../api/client';

const IncomingAttackWarning = ({ proximityAlerts, areaId, onScoutStarted }) => {
  if (!proximityAlerts || proximityAlerts.length === 0) return null;

  const handleScout = async (missionId) => {
    try {
      await GameClient.launchScout(areaId, missionId);
      if (onScoutStarted) onScoutStarted();
    } catch (e) {
      alert(e.message || "Failed to send scout. Ensure you have 1 Villager and 50 Knowledge.");
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 80, 
      right: 20, 
      zIndex: 999, 
      width: 320, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 12 
    }}>
      {proximityAlerts.map(alert => (
        <div key={alert.id} style={{ 
          border: '2px solid #ff4d4d', 
          background: 'rgba(30, 0, 0, 0.95)',
          padding: '16px',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(255, 0, 0, 0.4)',
          color: '#fff',
          fontFamily: 'MedievalSharp, serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#ff4d4d', fontSize: '1.4rem' }}></i>
            <h4 style={{ margin: 0, color: '#ff4d4d', fontSize: '1.2rem', textTransform: 'uppercase' }}>Incoming Movement!</h4>
          </div>
          
          <p style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#eee' }}>
            {alert.message}
          </p>
          
          <div style={{ 
            fontSize: '0.95rem', 
            color: 'var(--accent-gold)', 
            fontWeight: 'bold', 
            marginBottom: 12,
            padding: '4px 8px',
            background: 'rgba(255, 215, 0, 0.1)',
            borderRadius: 4,
            display: 'inline-block'
          }}>
            ETA: {alert.etaLabel || "Unknown"}
          </div>

          {alert.scoutedData ? (
            <div style={{ 
              background: 'rgba(0,0,0,0.4)', 
              padding: 12, 
              borderRadius: 6, 
              fontSize: '0.9rem', 
              marginBottom: 10,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 6, marginBottom: 8, color: 'var(--accent-gold)' }}>
                <strong><i className="fas fa-scroll"></i> Scout Report:</strong>
              </div>
              <div style={{ marginBottom: 8, fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 4 }}>
                Owner: <span style={{ color: 'var(--accent-gold)' }}>{alert.scoutedData.originOwnerName || 'Unknown'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(alert.scoutedData.units).filter(([_, count]) => count > 0).map(([unit, count]) => (
                  <div key={unit} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ opacity: 0.8 }}>{unit}:</span> 
                    <span style={{ fontWeight: 'bold' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button 
              onClick={() => handleScout(alert.missionId)}
              style={{ 
                width: '100%', 
                padding: '10px',
                background: 'linear-gradient(to bottom, #5c4033, #3e2723)',
                border: '1px solid #8d6e63',
                borderRadius: 4,
                color: 'var(--parchment)',
                cursor: 'pointer',
                fontFamily: 'MedievalSharp, serif',
                fontSize: '1rem',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#8d6e63'}
            >
              <i className="fas fa-eye"></i> Send Scout (1 Villager, 50 Knowledge)
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default IncomingAttackWarning;
