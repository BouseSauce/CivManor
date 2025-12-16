import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';

export default function EconomyPanel({ buildings = [], onUpgrade }) {
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className='panel'>
        <div className='panel-header'>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-header)', color: 'var(--accent-gold)' }}>
            <i className='fa-solid fa-coins' style={{ marginRight: 8 }}></i>Economy Overview
          </h3>
        </div>
        <div className='panel-body'>
          <div style={{ color: 'var(--text-muted)', padding: 8 }}>Economic buildings manage markets, trade and taxation.</div>
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily: 'var(--font-header)', color: 'var(--text-light)', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 12 }}>Economic Buildings</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {buildings.map(b => (
            <BuildingCard key={b.id} b={b} onOpen={setSelectedBuilding} onUpgrade={onUpgrade} />
          ))}
          {buildings.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No economic buildings present.</div>
          )}
        </div>
      </div>

      <BuildingDetailPanel building={selectedBuilding} onClose={() => setSelectedBuilding(null)} onUpgrade={(id) => { onUpgrade && onUpgrade(id); setSelectedBuilding(null); }} />
    </div>
  );
}
