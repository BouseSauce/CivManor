import React, { useState } from 'react';
import BuildingPreview from './BuildingPreview';
import { GameClient } from '../api/client';
import HexGrid from './HexGrid';

export default function RegionView({ region, onBack, onViewArea, onClaim, user }) {
  const [previewFor, setPreviewFor] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [claimModal, setClaimModal] = useState(null); // { area, name, loading }
  const [messageModal, setMessageModal] = useState(null); // { area, toUserId, toName, subject, body, sending }

  if (!region) return null;

  // Map areas to grid positions (10x10)
  const gridItems = region.areas.map((a, i) => ({
    ...a,
    x: a.x !== undefined ? a.x : i % 10,
    y: a.y !== undefined ? a.y : Math.floor(i / 10),
    owned: a.ownerId === user?.id,
    allied: false, // TODO: Implement alliance logic
    enemy: a.ownerId && a.ownerId !== user?.id
  }));

  const handleHexClick = (item) => {
    if (item.ownerId) {
      onViewArea(item.id, item.ownerId);
    } else {
      // Prompt to claim if unowned
      const cartCount = (user && user.inventory && user.inventory.units && (user.inventory.units.SupplyCart || user.inventory.units.SupplyWagon || user.inventory.units.TradeCart)) || 0;
      if (cartCount > 0) {
        setClaimModal({ area: item, name: item.name || '', loading: false });
      } else {
        alert('This area is unowned, but you need a Trade Cart to claim it.');
      }
    }
  };

  return (
    <div className="region-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="beveled-panel" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px', 
        marginBottom: '12px' 
      }}>
        <span className="font-cinzel" style={{ fontSize: '1.2em', color: '#e0cda0' }}>{region.name} (Micro View)</span>
        <button className="btn-primary font-cinzel" onClick={onBack}>Back to World</button>
      </div>

      <div className="beveled-panel" style={{ flex: 1, overflow: 'hidden', padding: '0', position: 'relative', background: '#1a1a1a' }}>
        <HexGrid 
          width={10} 
          height={10} 
          items={gridItems} 
          className="micro"
          onHexClick={handleHexClick}
          renderHexContent={(item) => (
            <>
              <div className="hex-icon">
                {item.owned ? <i className="fa-solid fa-certificate" style={{color: '#ffd700'}}></i> : 
                 item.enemy ? <i className="fa-solid fa-shield-halved" style={{color: '#f44336'}}></i> :
                 <i className="fa-solid fa-tree" style={{ opacity: 0.5 }}></i>}
              </div>
              <div className="hex-label font-garamond" style={{ fontSize: '0.7rem', color: '#ccc' }}>{item.name}</div>
              {item.ownerId && <div className="hex-coords font-garamond" style={{ fontSize: '0.6rem', color: '#aaa' }}>{item.ownerName || 'Player'}</div>}
            </>
          )}
        />
      </div>

      {/* Modals (Claim, Message, Preview) */}
      {claimModal && claimModal.area && (
        <div className="overlay">
          <div className="overlay-content panel" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Claim Area</h3>
              <button className="btn" onClick={() => setClaimModal(null)}>Close</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8 }}>You're about to claim <strong>{claimModal.area.name}</strong>.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={claimModal.name} onChange={e => setClaimModal({ ...claimModal, name: e.target.value })} style={{ flex: 1 }} />
                <button className="btn btn-claim" disabled={claimModal.loading} onClick={async () => {
                  try {
                    setClaiming(claimModal.area.id);
                    setClaimModal({ ...claimModal, loading: true });
                    let res = null;
                    if (onClaim) {
                      try { res = await onClaim(claimModal.area.id, claimModal.name); } catch (e) { res = null; }
                    } else {
                      res = await GameClient.claimArea(claimModal.area.id, claimModal.name);
                    }
                    if (res && res.success) {
                       // Success handled by parent refresh usually, but we close modal
                       setClaimModal(null);
                    } else {
                       // Fallback check
                       const owned = await GameClient.getArea(claimModal.area.id).catch(() => null);
                       if (owned && owned.owned) {
                         setClaimModal(null);
                         onViewArea && onViewArea(claimModal.area.id, owned.ownerId);
                       } else {
                         alert('Failed to claim area');
                       }
                    }
                  } catch (err) {
                    console.error('Claim error', err);
                    alert('Error claiming area');
                  } finally {
                    setClaiming(null);
                    setClaimModal(null);
                  }
                }}>Confirm</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cost: 1 Trade Cart</div>
            </div>
          </div>
        </div>
      )}

      {messageModal && (
        <div className="overlay">
          <div className="overlay-content panel" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Message {messageModal.toName}</h3>
              <button className="btn" onClick={() => setMessageModal(null)}>Close</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8 }}><strong>To:</strong> {messageModal.toName}</div>
              <div style={{ marginBottom: 8 }}>
                <input placeholder="Subject" value={messageModal.subject} onChange={e => setMessageModal({ ...messageModal, subject: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <textarea placeholder="Message body" value={messageModal.body} onChange={e => setMessageModal({ ...messageModal, body: e.target.value })} style={{ width: '100%', minHeight: 120 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => setMessageModal(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={messageModal.sending} onClick={async () => {
                  try {
                    setMessageModal({ ...messageModal, sending: true });
                    await GameClient.sendMessage(messageModal.toUserId, messageModal.subject, messageModal.body);
                    alert('Message sent');
                    setMessageModal(null);
                  } catch (err) {
                    console.error('Send message failed', err);
                    alert(err && err.message ? err.message : 'Failed to send message');
                    setMessageModal({ ...messageModal, sending: false });
                  }
                }}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

