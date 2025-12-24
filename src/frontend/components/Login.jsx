import React, { useState, useEffect } from 'react';
import { GameClient } from '../api/client';

export default function Login({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gb_test_accounts') || '[]';
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSavedAccounts(parsed);
    } catch (e) { setSavedAccounts([]); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await GameClient.login(username, password);
      if (res && res.token) {
        localStorage.setItem('gb_token', res.token);
        GameClient.setToken(res.token);
        onAuth({ id: res.user.id, username: res.user.username, token: res.token });
          // Optionally remember test accounts created earlier — keep recent list
          try {
            const raw = localStorage.getItem('gb_test_accounts') || '[]';
            const parsed = JSON.parse(raw);
            const next = Array.isArray(parsed) ? parsed.filter(a => a.username !== res.user.username) : [];
            next.unshift({ id: res.user.id, username: res.user.username, token: res.token });
            localStorage.setItem('gb_test_accounts', JSON.stringify(next.slice(0, 20)));
            setSavedAccounts(next.slice(0, 20));
          } catch (e) { }
      } else {
        alert('Login failed');
      }
    } catch (err) {
      alert(err?.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h3>Login</h3>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-row">
          <label>Username</label>
          <input placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="auth-row">
          <label>Password</label>
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="auth-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          <div className="muted-note">OR</div>
          <button className="btn btn-ghost" type="button" onClick={async () => {
            setLoading(true);
            try {
              const res = await GameClient.createTestAccount();
              if (res && res.token) {
                localStorage.setItem('gb_token', res.token);
                GameClient.setToken(res.token);
                onAuth({ id: res.user.id, username: res.user.username, token: res.token });
                // Save this test account for quick reuse
                try {
                  const raw = localStorage.getItem('gb_test_accounts') || '[]';
                  const parsed = JSON.parse(raw);
                  const next = Array.isArray(parsed) ? parsed.filter(a => a.username !== res.user.username) : [];
                  // Server returns plaintext password for test accounts; store it locally so auto-login can re-authenticate
                  next.unshift({ id: res.user.id, username: res.user.username, token: res.token, password: res.user.password });
                  localStorage.setItem('gb_test_accounts', JSON.stringify(next.slice(0, 20)));
                  setSavedAccounts(next.slice(0, 20));
                } catch (e) { }
              } else {
                alert('Failed to create test account');
              }
            } catch (err) {
              alert('Error creating test account');
            } finally {
              setLoading(false);
            }
          }}>Create Test Account</button>
        </div>
        {savedAccounts && savedAccounts.length > 0 && (
          <div style={{ marginTop: 24, borderTop: '1px solid var(--wood-dark)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--parchment-dark)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Saved Test Accounts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedAccounts.map((a, i) => (
                <div key={a.username + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--parchment)' }}>{a.username}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={async () => {
                        // Try to sign in using saved plaintext password if available, otherwise restore token
                        try {
                          if (a.password) {
                            const res = await GameClient.login(a.username, a.password);
                            if (res && res.token) {
                              localStorage.setItem('gb_token', res.token);
                              GameClient.setToken(res.token);
                              onAuth && onAuth({ id: res.user.id, username: res.user.username, token: res.token });
                              // update saved entry with fresh token
                              try {
                                const raw = localStorage.getItem('gb_test_accounts') || '[]';
                                const parsed = JSON.parse(raw);
                                const next = Array.isArray(parsed) ? parsed.filter(s => s.username !== res.user.username) : [];
                                next.unshift({ id: res.user.id, username: res.user.username, token: res.token, password: a.password });
                                localStorage.setItem('gb_test_accounts', JSON.stringify(next.slice(0, 20)));
                                setSavedAccounts(next.slice(0, 20));
                              } catch (e) {}
                              return;
                            }
                            alert('Auto-login failed for saved account');
                            return;
                          }
                          if (a.token) {
                            try { localStorage.setItem('gb_token', a.token); GameClient.setToken(a.token); } catch (e) {}
                            onAuth && onAuth({ id: a.id, username: a.username, token: a.token });
                            return;
                          }
                          alert('No saved credentials for this account. Please create a new test account.');
                        } catch (err) {
                          alert(err?.message || 'Failed to login with saved account');
                        }
                      }}>Use</button>
                    <button className="btn" style={{ padding: '4px 8px', background: '#b71c1c', color: '#fff', border: 'none' }} onClick={() => {
                      try {
                        const next = savedAccounts.filter(s => !(s.username === a.username && s.id === a.id));
                        localStorage.setItem('gb_test_accounts', JSON.stringify(next));
                        setSavedAccounts(next);
                      } catch (e) { }
                    }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
