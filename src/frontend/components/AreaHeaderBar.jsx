import React from 'react';
import { RESOURCE_ICON_MAP } from '../constants/iconMaps';

/**
 * AreaHeaderBar
 * Displays key resource stocks in the "Resource Ribbon" style.
 */
const AreaHeaderBar = ({ resources, stats }) => {
    const gameResources = ['Food','Timber','Stone','Coal','Planks','IronIngot','Steel','Knowledge','Horses','Captives'];

    const cap = (s) => s[0].toUpperCase() + s.slice(1);

    return (
        <div className="top-bar" style={{
                height: '84px', /* Slightly taller */
                background: 'linear-gradient(180deg, var(--wood-dark), var(--wood-medium))',
                borderBottom: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                gap: '18px',
                zIndex: 120,
                boxShadow: '0 8px 20px rgba(0,0,0,0.7)',
                color: 'var(--text-main)',
                pointerEvents: 'none'
            }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', pointerEvents: 'auto' }}>
                <div style={{ fontWeight: 800, letterSpacing: 1, color: 'var(--text-main)', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {stats?.areaId ? `AREA: ${stats.areaId}` : 'WORLD VIEW'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', pointerEvents: 'auto' }}>
                {gameResources.map(res => {
                    const displayKey = cap(res);
                    const def = RESOURCE_ICON_MAP[displayKey] || { icon: 'fa-box', color: '#bfbfbf' };
                    const icon = def.icon || 'fa-box';
                    const color = def.color || '#fff';
                    const rawAmount = (resources && (resources[res] || resources[displayKey])) || 0;
                    const amount = Math.max(0, Math.floor(rawAmount));

                    return (
                        <div key={res} className="resource-box" style={{ 
                            position: 'relative',
                            width: 72, 
                            height: 62, 
                            marginTop: 8,
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.15))',
                            border: '2px solid rgba(0,0,0,0.6)',
                            borderRadius: 6,
                            boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.02), 0 6px 14px rgba(0,0,0,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingBottom: 6,
                            color: 'var(--text-main)'
                        }} title={`${cap(res)}: ${amount}`}>
                            {/* Colored circular icon badge */}
                            <div style={{ 
                                position: 'absolute', 
                                top: -16, 
                                left: '50%', 
                                transform: 'translateX(-50%)',
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 3px 6px rgba(0,0,0,0.6)'
                            }}>
                                <i className={`fa-solid ${icon}`} style={{ fontSize: 16, color: '#fff' }} />
                            </div>

                            {/* Amount - larger and high contrast */}
                            <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: 800, 
                                fontFamily: 'Lato, sans-serif',
                                color: 'var(--text-highlight)',
                                lineHeight: 1,
                                textShadow: '0 2px 4px rgba(0,0,0,0.7)'
                            }}>
                                {amount > 999999 ? `${(amount/1000000).toFixed(1)}M` : amount > 9999 ? `${(amount/1000).toFixed(1)}K` : amount.toLocaleString()}
                            </div>
                            
                            {/* Label (Tiny) */}
                            <div style={{ 
                                fontSize: '0.65rem', 
                                textTransform: 'uppercase', 
                                color: 'var(--text-muted)',
                                fontWeight: 700,
                                marginTop: 4,
                                fontFamily: 'Cinzel, serif'
                            }}>
                                {cap(res)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {stats && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
                    <div style={{ 
                        background: 'var(--parchment)', 
                        border: '3px solid var(--ink-brown)', 
                        borderRadius: 8, 
                        padding: '4px 12px',
                        color: 'var(--text-brown)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Population</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'center' }}>{stats.currentPop} / {stats.maxPop}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AreaHeaderBar;
