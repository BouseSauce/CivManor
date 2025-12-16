import React from 'react';

/**
 * AreaHeaderBar
 * Displays key resource stocks in large, clean typography.
 * Resources: Gold, Timber, Stone, Steel, IronOre.
 */
const AreaHeaderBar = ({ resources }) => {
    const displayResources = ['Gold', 'Timber', 'Stone', 'Steel', 'IronOre'];

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '1rem',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            borderBottom: '2px solid #333',
            fontFamily: 'monospace'
        }}>
            {displayResources.map(res => (
                <div key={res} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{res.toUpperCase()}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {resources[res] ? Math.floor(resources[res]).toLocaleString() : 0}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AreaHeaderBar;
