import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';
import { POP_GROWTH_MULTIPLIER } from '../../core/logic/economy.js';
import ResearchCard from './ResearchCard';
import TechTree from './TechTree';

export default function ResearchPanel({ area, onRefresh, buildingId = null }) {
  const [researchState, setResearchState] = useState({ researched: [], active: null, available: [], defs: {} });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await GameClient.getResearch();
        if (mounted) setResearchState(res || { researched: [], active: null, available: [], defs: {} });
      } catch (e) { console.error('Failed to load research', e); }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(t); };
  }, [area && area.id]);

  // Build list of tech ids related to this area.
  // Support server `defs` shape that is either grouped by building (e.g., { BuildingId: { techId: def } })
  // or flat (e.g., { techId: def }). Prefer grouped lookup when available for accuracy.
  const areaTechIds = (() => {
    try {
      const defs = researchState.defs || {};
      const techSet = new Set();

      const isPropertyOnlyDef = (d) => {
        if (!d || typeof d !== 'object') return false;
        // Keys that indicate this def is likely just metadata/properties
        const metaKeys = new Set(['level', 'cost', 'durationSeconds', 'locked', 'startable', 'requirement']);
        const keys = Object.keys(d || {});
        if (keys.length === 0) return true;
        // If every key is within metaKeys (or its value is null/undefined), treat as property-only
        return keys.every(k => metaKeys.has(k));
      };

      // If server returned grouped defs by building (value is object of tech defs), prefer that
      const isGrouped = Object.values(defs).some(v => v && typeof v === 'object' && Object.values(v).some(x => x && typeof x === 'object' && x.id));
      if (isGrouped) {
        if (buildingId) {
          const group = defs[buildingId] || {};
          Object.keys(group || {}).forEach(tid => { if (tid) {
            const def = group[tid];
            if (!isPropertyOnlyDef(def)) techSet.add(tid);
          }});
          return Array.from(techSet);
        }
        (area.buildings || []).forEach(b => {
          const group = defs[b.id] || {};
          Object.keys(group || {}).forEach(tid => { if (tid) {
            const def = group[tid];
            if (!isPropertyOnlyDef(def)) techSet.add(tid);
          }});
        });
        return Array.from(techSet);
      }

      // Fallback: defs is flat mapping techId->def. Find defs whose requirement matches this area's buildings
      const flat = defs || {};
      const buildingIds = new Set((area.buildings || []).map(b => b.id));
      Object.entries(flat).forEach(([tid, def]) => {
        if (!def) return;
        if (isPropertyOnlyDef(def)) return;
        // If a specific building filter is provided, prefer matching that building
        if (buildingId) {
          if (def.requirement && def.requirement.building && def.requirement.building === buildingId) {
            techSet.add(tid); return;
          }
          // Also consider legacy relatedTechs on the building object
          const b = (area.buildings || []).find(x => x.id === buildingId);
          if (b && (b.relatedTechs || []).some(rt => ((typeof rt === 'string') ? rt : (rt && (rt.id || rt.name))) === tid)) { techSet.add(tid); return; }
          return;
        }
        // If def has explicit requirement building, include if it matches an area building
        if (def.requirement && def.requirement.building && buildingIds.has(def.requirement.building)) { techSet.add(tid); return; }
        // Also include if the def mentions the building id in other legacy fields (e.g., requiredTownLevel not applicable)
        // As a last resort, include techs that are referenced by buildings via `relatedTechs` on building objects
        (area.buildings || []).forEach(b => {
          (b.relatedTechs || []).forEach(rt => {
            const rid = typeof rt === 'string' ? rt : (rt && (rt.id || rt.name));
            if (rid === tid) techSet.add(tid);
          });
        });
      });
      return Array.from(techSet);
    } catch (e) { return []; }
  })();

  const start = async (techId) => {
    setLoading(true);
    try {
      await GameClient.startResearch(techId);
      if (onRefresh) onRefresh();
      const res = await GameClient.getResearch();
      setResearchState(res || researchState);
    } catch (e) { alert(e && e.error ? e.error : (e && e.message) || 'Failed to start research'); }
    setLoading(false);
  };

  const { researched = [], active = null, defs = {} } = researchState;

  // Vitality block: compute time-saved based on research levels
  const vitalityBlock = (() => {
    try {
      const thLvl = (area && (area.buildings || []).find(b => b.id === 'TownHall') && (area.buildings.find(b => b.id==='TownHall').level || 0)) || (area && area.buildings && area.buildings['TownHall']) || 0;
      const baseRatePerHour = 0.1 * Math.max(0, thLvl);
      if (!baseRatePerHour) return null;
      const sanLvl = (area && area.techLevels && area.techLevels['Sanitation Works']) || 0;
      const medLvl = (area && area.techLevels && area.techLevels['Medical Alchemy']) || 0;
      const total = (sanLvl || 0) + (medLvl || 0);
      const baseTimer = Math.round(3600 / (baseRatePerHour * (POP_GROWTH_MULTIPLIER || 1)));
      const modifiedTimer = Math.round(baseTimer / (1 + (total * 0.1)));
      const saved = Math.max(0, baseTimer - modifiedTimer);
      return { baseTimer, modifiedTimer, saved, sanLvl, medLvl };
    } catch (e) { return null; }
  })();

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="font-cinzel" style={{ fontSize: '1em', color: '#aaa' }}>Research</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn btn-primary`} onClick={() => { /* no-op: default related */ }}>Related</button>
          <button className={`btn`} onClick={() => { /* toggle to tech tree by replacing content below */ window.location.hash = '#tech-tree'; }}>Tech Tree</button>
        </div>
      </div>

      {/* Simple routing: if URL hash is #tech-tree show full tree, else show related */}
      {window && window.location && window.location.hash === '#tech-tree' ? (
        <div style={{ marginTop: 8 }}>
          <TechTree area={area} />
        </div>
      ) : (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px',
            paddingBottom: '20px'
        }}>
          {areaTechIds.length === 0 && <div className="font-garamond" style={{ color: '#aaa' }}>No related research for this area.</div>}
          {areaTechIds.map(tid => (
            <ResearchCard
              key={tid}
              id={tid}
              def={defs[tid] || {}}
              researched={(researched || []).includes(tid)}
              researchedList={researched || []}
              active={active}
              onStart={start}
              area={area}
            />
          ))}
          {/* Vitality subsection for Library */}
          {((area && (area.buildings || []).find(b=>b.id==='Library')) && vitalityBlock) && (
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-baby" style={{ color: '#ffd54f', fontSize: '1.4rem' }}></i>
                <div>
                  <div className="font-cinzel" style={{ color: '#e0cda0' }}>Vitality</div>
                  <div className="font-garamond" style={{ color: '#ccc', fontSize: '0.8rem' }}>Civilian Growth & Refugee Policy</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                <div style={{ fontSize: '0.9rem' }}>Next Villager (base): <strong>{vitalityBlock.baseTimer}s</strong></div>
                <div style={{ fontSize: '0.9rem' }}>Next Villager (with Research): <strong>{vitalityBlock.modifiedTimer}s</strong> <span style={{ color: '#aaffaa' }}> (Saved {vitalityBlock.saved}s)</span></div>
                <div style={{ fontSize: '0.85rem', color: '#bbb' }}>Sanitation Lvl: {vitalityBlock.sanLvl} • Medical Lvl: {vitalityBlock.medLvl}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><i className="fas fa-cornucopia" style={{ color: '#f6c357' }}></i> Food Efficiency</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><i className="fas fa-drafting-compass" style={{ color: '#9ad0ff' }}></i> Urban Planning</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
