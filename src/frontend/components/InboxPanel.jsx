import React, { useEffect, useState, useRef } from 'react';
import { GameClient } from '../api/client';

export default function InboxPanel({ onClose, initialRecipient = null }) {
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });

  // If an initial recipient is provided (e.g., from map Message button), prefill compose.to
  const recipientRef = useRef(null);

  // If an initial recipient is provided (e.g., from map Message button), open compose and focus
  useEffect(() => {
    if (initialRecipient) {
      setCompose(c => ({ ...c, to: initialRecipient }));
      setTab('compose');
      // Focus the recipient select after render
      setTimeout(() => {
        try { recipientRef.current && recipientRef.current.focus(); } catch (e) {}
      }, 50);
    }
  }, [initialRecipient]);

  const load = async () => {
    setLoading(true);
    try {
      const i = await GameClient.getInbox();
      // Group messages into threads by 'threadId' or by reply parent
      const messages = i.messages || [];
      // Build thread map: if message has threadId, use it; else use parentId or message id
      const threads = {};
      messages.forEach(m => {
        const tid = m.threadId || m.parentId || m.id;
        threads[tid] = threads[tid] || { id: tid, messages: [] };
        threads[tid].messages.push(m);
      });
      // Convert to array sorted by most recent message
      const threadList = Object.values(threads).map(t => ({ id: t.id, messages: t.messages.sort((a,b)=>a.createdAt - b.createdAt) })).sort((a,b)=> b.messages[b.messages.length-1].createdAt - a.messages[a.messages.length-1].createdAt);
      setInbox(threadList || []);
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
    <div className="medieval-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-title" style={{ flexShrink: 0 }}>
        <span>Royal Messenger</span>
        <i className="fa-solid fa-envelope"></i>
      </div>
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <button className={`btn-medieval ${tab==='inbox'?'active':''}`} onClick={() => setTab('inbox')} style={{ background: tab === 'inbox' ? 'var(--ember)' : '' }}>Inbox</button>
          <button className={`btn-medieval ${tab==='sent'?'active':''}`} onClick={() => setTab('sent')} style={{ background: tab === 'sent' ? 'var(--ember)' : '' }}>Sent</button>
          <button className={`btn-medieval ${tab==='compose'?'active':''}`} onClick={() => setTab('compose')} style={{ background: tab === 'compose' ? 'var(--ember)' : '' }}>Compose</button>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn-medieval" onClick={load}><i className="fa-solid fa-rotate"></i></button>
          </div>
        </div>

        {tab === 'inbox' && (
          <div className="scroll-content" style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? <div>Loading...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {inbox.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No messages</div>}
                {inbox.map(thread => {
                  const last = thread.messages[thread.messages.length-1];
                  const unread = thread.messages.some(m => !m.read);
                  return (
                    <div key={thread.id} style={{ padding: 12, borderBottom: '1px solid var(--parchment-dark)', background: unread ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div className="wax-seal" style={{ width: '40px', height: '40px', borderRadius: 8, background: unread ? '#b71c1c' : '#455a64', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <i className={`fa-solid ${unread ? 'fa-envelope' : 'fa-check'}`}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 800 }}>{last.subject || '(no subject)'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>From: {last.fromName || last.from} • {new Date(last.createdAt).toLocaleString()}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn-medieval" onClick={() => {
                                // Expand thread in place: simple prompt showing full thread for now
                                const body = thread.messages.map(m => `${m.fromName || m.from}: ${m.body}`).join('\n\n');
                                if (confirm('Open thread?')) {
                                  alert(body);
                                }
                              }}>Open</button>
                              <button className="btn-medieval" onClick={async () => {
                                // Reply: prefill compose fields and switch to compose
                                const firstMsg = thread.messages[0];
                                setTab('inbox');
                                setCompose({ to: firstMsg.from, subject: `RE: ${firstMsg.subject || ''}`, body: '' });
                                // optionally mark messages read
                                for (const m of thread.messages) { if (!m.read) await markRead(m.id); }
                              }}>Reply</button>
                            </div>
                          </div>
                          <div style={{ marginTop: 8, fontStyle: 'italic' }}>{last.body}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        {tab === 'compose' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Compose</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <select ref={recipientRef} value={compose.to} onChange={e => setCompose(s => ({ ...s, to: e.target.value }))} style={{ minWidth: 220 }}>
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
        )}

      </div>
    </div>
  );
}
