import React from 'react';

export default function WorldBrowser({ regions, onSelectRegion }) {
  return (
    <div className="world-browser panel">
      <div className="panel-header">World Browser</div>
      <div className="panel-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {regions.map(region => (
            <div key={region.id} className="region-tile panel" style={{ padding: 12 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{region.name}</div>
              <div style={{ fontSize: 12, color: '#bbb' }}>{region.id}</div>
              <div style={{ marginTop: 8 }}>{region.areas.length} areas</div>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => onSelectRegion(region.id)}>Browse</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
