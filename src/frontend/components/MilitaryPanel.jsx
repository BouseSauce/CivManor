import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';

export default function MilitaryPanel({ units, buildings, onRecruit, onUpgrade }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Group units by type
  const unitCounts = (units || []).reduce((acc, u) => {
    // Exclude civilian Villagers from military stationed forces display
    if (u.type === 'Villager' || u.type === 'Peasant') return acc;
    acc[u.type] = (acc[u.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Stationed Forces Section */}
      <div className='panel'>
        <div className='panel-header'>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-header)', color: 'var(--accent-gold)' }}>
            <i className='fa-solid fa-chess-rook' style={{ marginRight: 8 }}></i>Stationed Forces
          </h3>
        </div>
        <div className='panel-body'>
          {Object.keys(unitCounts).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: 16, textAlign: 'center' }}>
              No military units stationed here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {Object.entries(unitCounts).map(([type, count]) => (
                <div key={type} style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--border-color)', 
                  padding: 12, 
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{ 
                    width: 40, height: 40, 
                    background: 'var(--bg-dark)', 
                    borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-gold)',
                    fontSize: '1.2rem'
                  }}>
                    <i className='fa-solid fa-person-rifle'></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{type}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Count: {count}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Military Infrastructure Section */}
      <div>
        <h3 style={{ 
          fontFamily: 'var(--font-header)', 
          color: 'var(--text-light)', 
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 8,
          marginBottom: 16
        }}>
          Military Infrastructure
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {buildings.map(b => (
            <BuildingCard 
              key={b.id} 
              b={b} 
              onOpen={setSelectedBuilding} 
              onUpgrade={onUpgrade}
            />
          ))}
          {buildings.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No military buildings constructed.
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal/Panel */}
      <BuildingDetailPanel 
        building={selectedBuilding} 
        onClose={() => setSelectedBuilding(null)} 
        onUpgrade={(id) => { onUpgrade(id); setSelectedBuilding(null); }} 
      />

    </div>
  );
}
