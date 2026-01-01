import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';
import { BUILDING_CONFIG } from '../../core/config/buildings.js';
import { calculateStorageCapacity } from '../../core/logic/scaling.js';
import { getIconForResource } from '../constants/iconMaps';
import { ResourceEnum } from '../../core/constants/enums.js';
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
    <div className="my-empire medieval-panel">
      <div className="panel-title">
        <span>My Empire</span>
        <i className="fa-solid fa-crown"></i>
      </div>
      <div className="panel-body" style={{ padding: 12 }}>
        {/* Show SupplyCart and cart contents for the current user */}
        {user && user.inventory && (
          <div style={{ marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--wood-light)', borderRadius: 2 }}>
            <div style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 'bold', fontFamily: 'var(--font-header)' }}>Civilization Cart</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Carts: {(user.inventory.units && (user.inventory.units.SupplyCart || user.inventory.units.SupplyWagon || user.inventory.units.TradeCart || user.inventory.units.SupplyCart === 0)) ? (user.inventory.units.SupplyCart || user.inventory.units.SupplyWagon || user.inventory.units.TradeCart || 0) : 0}</div>
            {user.inventory.cartContents && Object.keys(user.inventory.cartContents).length > 0 ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-main)' }}>Cart Contents:</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {Object.entries(user.inventory.cartContents).map(([k,v]) => (
                    <div key={k} style={{ fontSize: 12, color: 'var(--text-main)', background: 'var(--wood-dark)', padding: '4px 8px', borderRadius: 3 }}>{v} {k}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>No goods in cart.</div>
            )}
          </div>
        )}
        {ownedMeta.length === 0 && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No owned areas yet.</div>}

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
            <div key={a.id} className="empire-tile medieval-panel" style={{ padding: 12, marginBottom: 12, border: '2px solid var(--wood-dark)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', fontFamily: 'var(--font-header)', fontSize: '1.1rem' }}>{a.name} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>({a.regionName})</span></div>
                <button className="btn-medieval" onClick={() => onViewArea(a.id)} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Manage</button>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>ID: {a.id}</div>
              {details[a.id] ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-main)' }}>Pop: {details[a.id].stats?.currentPop} / {details[a.id].stats?.maxPop}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-main)' }}>Approval: {details[a.id].stats?.approval}%</div>
                  {details[a.id].stats?.spyLevel > 0 && (
                    <div style={{ fontSize: 12, color: '#67b0ff', fontWeight: 'bold' }}>Spy Level: {details[a.id].stats.spyLevel}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {['Timber','Stone','Coal','Food','Planks','IronIngot','Steel','Knowledge','Horses','Captives'].map(k => {
                      const cur = Math.floor(details[a.id].resources?.[k] || 0).toLocaleString();
                      // compute cap from Storehouse if available
                      let cap = null;
                      try {
                        const storeLevel = (details[a.id].buildings || []).find(b => b.id === 'Storehouse')?.level || 0;
                        cap = calculateStorageCapacity(k, storeLevel);
                      } catch (e) { /* ignore */ }
                      const iconData = getIconForResource(k) || { icon: 'fa-box', color: '#bbb' };
                      return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: 4 }}>
                          <i className={`fa-solid ${iconData.icon}`} style={{ color: iconData.color }}></i>
                          <div style={{ fontSize: 12, color: '#eee' }}>{cur}{cap ? ` / ${cap.toLocaleString()}` : ''} <span style={{ color: '#888', marginLeft: 6, fontSize: 11 }}>{k}</span></div>
                        </div>
                      );
                    })}
                  </div>
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
