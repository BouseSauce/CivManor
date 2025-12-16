import React, { useState } from 'react';
import BuildingPreview from './BuildingPreview';
import { GameClient } from '../api/client';

export default function RegionView({ region, onBack, onViewArea, onClaim, user }) {
  const [previewFor, setPreviewFor] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const [claimModal, setClaimModal] = useState(null); // { area, name, loading }
  const [messageModal, setMessageModal] = useState(null); // { area, toUserId, toName, subject, body, sending }

  if (!region) return null;
  return (
    <div className="region-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{region.name}</h3>
        <div>
          <button className="btn" onClick={onBack}>Back to Regions</button>
        </div>
      </div>

      <div className="area-grid">
        {region.areas.map(a => (
          <div key={a.id} className="area-tile panel">
            <div style={{ fontWeight: 'bold' }}>{a.name}</div>
            <div style={{ fontSize: 12, color: '#bbb' }}>{a.id}</div>
            <div style={{ marginTop: 8 }}>{a.ownerId ? `Owner: ${a.ownerName || a.ownerId}` : 'Unowned'}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {a.ownerId ? (
                <>
                  <button className="btn" onClick={() => onViewArea(a.id, a.ownerId)}>View</button>
                  <button className="btn" onClick={() => setMessageModal({ area: a, toUserId: a.ownerId, toName: a.ownerName || a.ownerId, subject: `Regarding ${a.name}`, body: '', sending: false })}>Message</button>
                </>
              ) : (
                (() => {
                  const cartCount = (user && user.inventory && user.inventory.units && user.inventory.units.TradeCart) || 0;
                  // Only show the claim button when the user actually has a TradeCart.
                  if (cartCount < 1) return null;
                  const disabled = claiming === a.id;
                  return (
                    <>
                      <button
                        className="btn btn-claim"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          // open claim modal allowing name change
                          setClaimModal({ area: a, name: a.name || '', loading: false });
                        }}
                      >{claiming === a.id ? 'Claiming...' : 'Claim'}</button>

                      {claimModal && claimModal.area && claimModal.area.id === a.id && (
                        <div className="overlay">
                          <div className="overlay-content panel" style={{ maxWidth: 520 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h3 style={{ margin: 0 }}>Claim Area</h3>
                              <button className="btn" onClick={() => setClaimModal(null)}>Close</button>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <div style={{ marginBottom: 8 }}>You're about to claim <strong>{a.name}</strong> as your area. You may change the name below.</div>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <input value={claimModal.name} onChange={e => setClaimModal({ ...claimModal, name: e.target.value })} style={{ flex: 1 }} />
                                <div>
                                  <button className="btn btn-claim" disabled={claimModal.loading} onClick={async () => {
                                    try {
                                      setClaiming(a.id);
                                      setClaimModal({ ...claimModal, loading: true });
                                      let res = null;
                                      if (onClaim) {
                                        // If parent provided a claim handler, call it with name
                                        try { res = await onClaim(a.id, claimModal.name); } catch (e) { res = null; }
                                      } else {
                                        res = await GameClient.claimArea(a.id, claimModal.name);
                                      }
                                      // If parent handler didn't return success, try to fetch area to verify
                                      if (res && res.success) {
                                        const owned = await GameClient.getArea(a.id);
                                        if (owned && owned.owned) {
                                          setClaimModal(null);
                                          setClaiming(null);
                                          onViewArea && onViewArea(a.id, owned.ownerId);
                                        }
                                      } else {
                                        // Attempt to fetch area state as fallback
                                        const owned = await GameClient.getArea(a.id).catch(() => null);
                                        if (owned && owned.owned) {
                                          setClaimModal(null);
                                          setClaiming(null);
                                          onViewArea && onViewArea(a.id, owned.ownerId);
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
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Claiming will consume one TradeCart from your inventory.</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        ))}
      </div>

      {previewFor && (
        <div className="overlay">
          <div className="overlay-content panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Build Preview - {previewFor}</h3>
              <button className="btn" onClick={() => setPreviewFor(null)}>Close</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <BuildingPreview />
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
