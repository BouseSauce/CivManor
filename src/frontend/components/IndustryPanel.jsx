import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';

export default function IndustryPanel({ area = null, buildings = [], onUpgrade, onAssign }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Keep selected building fresh when buildings prop updates
  React.useEffect(() => {
    if (selectedBuilding) {
      const fresh = buildings.find(b => b.id === selectedBuilding.id);
      if (fresh) setSelectedBuilding(fresh);
    }
  }, [buildings, selectedBuilding?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className='panel' style={{ background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
        <div className='panel-header' style={{ background: 'none', border: 'none', padding: '0 0 12px 0', borderBottom: '2px solid var(--wood-dark)' }}>
          <h3 className="font-cinzel" style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 700 }}>
            <i className='fa-solid fa-industry' style={{ marginRight: 12 }}></i>Industry Overview
          </h3>
        </div>
        <div className='panel-body' style={{ padding: '12px 0' }}>
          <div className="font-garamond" style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Industry buildings produce crafted goods and enable advanced production chains.</div>
        </div>
      </div>

      <div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', 
          gap: 20,
          width: '100%',
          margin: '0 auto'
        }}>
          {buildings.map(b => (
            <BuildingCard key={b.id} b={b} onOpen={setSelectedBuilding} onUpgrade={onUpgrade} />
          ))}
          {buildings.length === 0 && (
            <div className="font-garamond" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '1.1rem' }}>No industrial buildings present.</div>
          )}
        </div>
      </div>

      <BuildingDetailPanel 
        building={selectedBuilding} 
        area={area}
        onClose={() => setSelectedBuilding(null)} 
        onUpgrade={(id) => { onUpgrade && onUpgrade(id); setSelectedBuilding(null); }} 
        onAssignVillagers={(id, count) => { return onAssign ? onAssign(id, count) : Promise.resolve(); }}
      />
    </div>
  );
}
