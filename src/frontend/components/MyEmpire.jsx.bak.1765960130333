import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';
import QueuePanel from './QueuePanel';

export default function MyEmpire({ regions, user, onViewArea }) {
  // gather owned areas metadata
  const ownedMeta = [];
  regions.forEach(r => r.areas.forEach(a => { if (user && a.ownerId === user.id) ownedMeta.push(Object.assign({}, a, { regionName: r.name })); }));

  const [details, setDetails] = useState({}); // areaId -> fetched area data

  useEffect(() => {
    let mounted = true;
    (async () => {
      const map = {};
      for (const a of ownedMeta) {
        try {
          const res = await GameClient.getArea(a.id);
          if (mounted && res && res.owned) map[a.id] = res;
        } catch (e) {
          // ignore per-area failures
        }
      }
      if (mounted) setDetails(map);
    })();
    return () => { mounted = false; };
  }, [regions, user]);

  return (
    <div className="my-empire panel">
      <div className="panel-header">My Empire</div>
      <div className="panel-body" style={{ padding: 12 }}>
        {/* Show TradeCart and cart contents for the current user */}
        {user && user.inventory && (
          <div style={{ marginBottom: 12, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
            <div style={{ fontSize: 12, color: '#ddd', fontWeight: 'bold' }}>Civilization Cart</div>
            <div style={{ fontSize: 12, color: '#ccc', marginTop: 6 }}>Carts: {(user.inventory.units && (user.inventory.units.TradeCart || user.inventory.units.TradeCart === 0)) ? (user.inventory.units.TradeCart || 0) : 0}</div>
            {user.inventory.cartContents && Object.keys(user.inventory.cartContents).length > 0 ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#ddd' }}>Cart Contents:</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {Object.entries(user.inventory.cartContents).map(([k,v]) => (
                    <div key={k} style={{ fontSize: 12, color: '#eee', background: 'rgba(0,0,0,0.25)', padding: '4px 6px', borderRadius: 3 }}>{v} {k}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>No goods in cart.</div>
            )}
          </div>
        )}
        {ownedMeta.length === 0 && <div>No owned areas yet.</div>}

        {/* Empire-wide queue summary */}
        <div style={{ marginBottom: 12 }}>
          <QueuePanel
            queue={Object.values(details).flatMap((d) => (d.queue || []).map(q => ({ ...q, areaId: d.id, areaName: d.name })))}
            onRefresh={async () => {
              // refresh details
              const map = {};
              for (const a of ownedMeta) {
                try {
                  const res = await GameClient.getArea(a.id);
                  if (res && res.owned) map[a.id] = res;
                } catch (e) {}
              }
              setDetails(map);
            }}
            onItemClick={(item) => {
              if (item && item.areaId) onViewArea(item.areaId);
            }}
          />

          {ownedMeta.map(a => (
            <div key={a.id} className="empire-tile panel" style={{ padding: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 'bold' }}>{a.name} <span style={{ fontSize: 12, color: '#bbb' }}>({a.regionName})</span></div>
              <div style={{ marginTop: 6 }}>ID: {a.id}</div>
              {details[a.id] ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: '#ddd' }}>Owner: {details[a.id].ownerName || user.username}</div>
                  <div style={{ fontSize: 12, color: '#ddd' }}>Pop: {details[a.id].stats?.currentPop} / {details[a.id].stats?.maxPop}</div>
                  <div style={{ fontSize: 12, color: '#ddd' }}>Approval: {details[a.id].stats?.approval}%</div>
                  <div style={{ fontSize: 12, color: '#ddd' }}>Timber: {Math.floor(details[a.id].resources?.Timber || 0).toLocaleString()}</div>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>Loading summary...</div>
              )}
              <button className="btn" style={{ marginTop: 8 }} onClick={() => onViewArea(a.id, a.ownerId)}>View</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
