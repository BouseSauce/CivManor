import React, { useEffect, useState } from 'react';
import { GameClient } from '../api/client';

export default function InboxPanel({ onClose }) {
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });

  const load = async () => {
    setLoading(true);
    try {
      const i = await GameClient.getInbox();
      setInbox(i.messages || []);
      const s = await GameClient.getSent();
      setSent(s.messages || []);
      const u = await GameClient.listUsers();
      setUsers(u.users || []);
    } catch (e) {
      console.error(e);
      alert('Failed to load messages');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await GameClient.markMessageRead(id);
      setInbox(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    } catch (e) { console.error(e); alert('Failed to mark read'); }
  };

  const send = async () => {
    if (!compose.to) return alert('Select recipient');
    try {
      await GameClient.sendMessage(compose.to, compose.subject, compose.body);
      setCompose({ to: '', subject: '', body: '' });
      setTab('sent');
      await load();
      alert('Message sent');
    } catch (e) { console.error(e); alert('Failed to send message'); }
  };

  return (
    <div className="panel">
      <div className="panel-header">Messages</div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className={`btn ${tab==='inbox'?'btn-primary':''}`} onClick={() => setTab('inbox')}>Inbox</button>
          <button className={`btn ${tab==='sent'?'btn-primary':''}`} onClick={() => setTab('sent')}>Sent</button>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn" onClick={load}>Refresh</button>
          </div>
        </div>

        {tab === 'inbox' && (
          <div>
            {loading ? <div>Loading...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inbox.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No messages</div>}
                {inbox.map(m => (
                  <div key={m.id} style={{ padding: 8, borderRadius: 6, background: m.read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{m.subject || '(no subject)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>From: {m.fromName || m.from} • {new Date(m.createdAt).toLocaleString()}</div>
                      <div style={{ marginTop: 6 }}>{m.body}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {!m.read && <button className="btn" onClick={() => markRead(m.id)}>Mark read</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'sent' && (
          <div>
            {loading ? <div>Loading...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sent.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No sent messages</div>}
                {sent.map(m => (
                  <div key={m.id} style={{ padding: 8, borderRadius: 6, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{m.subject || '(no subject)'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>To: {m.toName || m.to} • {new Date(m.createdAt).toLocaleString()}</div>
                      <div style={{ marginTop: 6 }}>{m.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Compose</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <select value={compose.to} onChange={e => setCompose(s => ({ ...s, to: e.target.value }))} style={{ minWidth: 220 }}>
              <option value="">Choose recipient</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            <input placeholder="Subject" value={compose.subject} onChange={e => setCompose(s => ({ ...s, subject: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <div>
            <textarea placeholder="Message body" value={compose.body} onChange={e => setCompose(s => ({ ...s, body: e.target.value }))} style={{ width: '100%', minHeight: 100 }} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={send}>Send</button>
            <button className="btn" onClick={() => setCompose({ to: '', subject: '', body: '' })}>Clear</button>
          </div>
        </div>

      </div>
    </div>
  );
}
