import React, { useState, useEffect } from 'react';
import { GameClient } from './api/client';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // If a token exists, prefer it
        const token = localStorage.getItem('gb_token');
        if (token) {
          GameClient.setToken(token);
          try {
            const account = await GameClient.getAccount();
            if (account && account.id) {
              setUser({ id: account.id, username: account.username || 'You', token, inventory: account.inventory });
              setLoading(false);
              return;
            }
          } catch (e) {
            // token may be invalid; fallthrough to test-account auto-login
          }
        }

        // Try saved test accounts auto-login (iterate until one logs in)
        try {
          const raw = localStorage.getItem('gb_test_accounts') || '[]';
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const a of parsed) {
              if (!a) continue;
              try {
                if (a.password) {
                  const res = await GameClient.login(a.username, a.password);
                  if (res && res.token) {
                    localStorage.setItem('gb_token', res.token);
                    GameClient.setToken(res.token);
                    const account = await GameClient.getAccount().catch(() => null);
                    setUser({ id: res.user.id, username: res.user.username, token: res.token, inventory: account ? account.inventory : undefined });
                    // refresh savedAccounts order
                    try {
                      const next = parsed.filter(x => x.username !== a.username);
                      next.unshift({ ...a, token: res.token });
                      localStorage.setItem('gb_test_accounts', JSON.stringify(next.slice(0,20)));
                    } catch (e) {}
                    setLoading(false);
                    return;
                  }
                }
              } catch (e) {
                // login failure, continue to next saved account
              }
              // fallback: try token restore for this entry
              try {
                if (a.token) {
                  localStorage.setItem('gb_token', a.token);
                  GameClient.setToken(a.token);
                  const account = await GameClient.getAccount().catch(() => null);
                  if (account && account.id) {
                    setUser({ id: account.id, username: account.username, token: a.token, inventory: account.inventory });
                    setLoading(false);
                    return;
                  }
                }
              } catch (e) {
                // ignore
              }
            }
          }
        } catch (e) {
          // ignore parsing errors
        }
      } catch (e) {
        console.error('Auto-login error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAuth = (authInfo) => {
    (async () => {
      try {
        const account = await GameClient.getAccount();
        if (account && account.id) {
          setUser({ id: account.id, username: account.username || authInfo.username || 'You', token: authInfo.token, inventory: account.inventory });
          return;
        }
      } catch (e) {
        // fallback to minimal user
      }
      setUser({ username: authInfo.username || 'You', token: authInfo.token });
    })();
  };

  const handleUserUpdate = (newUser) => {
    setUser(prev => ({ ...(prev || {}), ...(newUser || {}) }));
  };

  const handleLogout = () => {
    localStorage.removeItem('gb_token');
    GameClient.setToken(null);
    setUser(null);
  };

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="auth-viewport">
        <div className="auth-columns">
          <Login onAuth={handleAuth} />
          <Register onRegistered={() => alert('You can now log in with your new account.')} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
    </div>
  );
}

export default App;
