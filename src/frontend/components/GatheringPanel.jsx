import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';

export default function GatheringPanel({ buildings = [], onUpgrade }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className='panel'>
        <div className='panel-header'>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-header)', color: 'var(--accent-gold)' }}>
            <i className='fa-solid fa-seedling' style={{ marginRight: 8 }}></i>Gathering Overview
          </h3>
        </div>
        <div className='panel-body'>
          <div style={{ color: 'var(--text-muted)', padding: 8 }}>Gathering buildings collect raw resources from the land and sea.</div>
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily: 'var(--font-header)', color: 'var(--text-light)', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 12 }}>Gathering Buildings</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {buildings.map(b => (
            <BuildingCard key={b.id} b={b} onOpen={setSelectedBuilding} onUpgrade={onUpgrade} />
          ))}
          {buildings.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No gathering buildings present.</div>
          )}
        </div>
      </div>

      <BuildingDetailPanel building={selectedBuilding} onClose={() => setSelectedBuilding(null)} onUpgrade={(id) => { onUpgrade && onUpgrade(id); setSelectedBuilding(null); }} />
    </div>
  );
}
