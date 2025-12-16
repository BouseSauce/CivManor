import React, { useState } from 'react';
import BuildingCard from './BuildingCard';
import BuildingDetailPanel from './BuildingDetailPanel';

const MILITARY_BUILDINGS = ['Barracks', 'Stable', 'SiegeWorkshop', 'Smithy', 'Wall', 'Tower'];

/**
 * ManagementPanel - Displays a grid of buildings
 */
const ManagementPanel = ({ buildings, onUpgrade, onAssign, filter = 'all' }) => {
    const [selected, setSelected] = useState(null);

    const handleOpen = (b) => setSelected(b);
    const handleClose = () => setSelected(null);

    // Filter buildings
    const filteredBuildings = buildings.filter(b => {
        if (filter === 'economy') {
            return !MILITARY_BUILDINGS.includes(b.id) && b.resourceTier !== 'Warfare';
        }

        if (filter === 'built') {
            return b.level && b.level > 0;
        }

        if (filter === 'gathering') {
            const name = (b.name || '').toLowerCase();
            const gatheringNames = ['farm', 'lumber', 'quarry', 'mine', 'pasture', 'field'];
            if (b.produces) return true;
            if (gatheringNames.some(n => name.includes(n))) return true;
            if (b.resourceTier && /gather|agri|food|production/i.test(b.resourceTier)) return true;
            return false;
        }

        if (filter === 'industry') {
            const name = (b.name || '').toLowerCase();
            const industryNames = ['smith', 'workshop', 'mill', 'forge', 'factory', 'smithy'];
            if (b.resourceTier === 'Industry') return true;
            if (industryNames.some(n => name.includes(n))) return true;
            return false;
        }

        return true;
    });

    // Sort: Unlocked first, then constructed, then by name
    const sortedBuildings = [...filteredBuildings].sort((a, b) => {
        if ((a.isLocked ? 1 : 0) !== (b.isLocked ? 1 : 0)) return (a.isLocked ? 1 : 0) - (b.isLocked ? 1 : 0);
        if ((a.level || 0) > 0 && (b.level || 0) === 0) return -1;
        if ((a.level || 0) === 0 && (b.level || 0) > 0) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    return (
        <div className='panel'>
            <div className='panel-header'>
                {filter === 'economy' ? 'Civilian Infrastructure' : 'All Buildings'}
            </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
                        {sortedBuildings.map(b => (
                            <BuildingCard key={b.id} b={b} compact={true} onOpen={handleOpen} onAssign={(id) => { onAssign && onAssign(id); }} onUpgrade={(id) => { onUpgrade && onUpgrade(id); }} />
                        ))}
                    </div>

            <BuildingDetailPanel 
                building={selected} 
                onClose={handleClose} 
                onUpgrade={(id) => { onUpgrade && onUpgrade(id); handleClose(); }} 
                onAssignVillagers={(id, count) => { if (onAssign) onAssign(id, count); }}
            />
        </div>
    );
};

export default ManagementPanel;
