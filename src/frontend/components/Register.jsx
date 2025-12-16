import React, { useState } from 'react';
import { GameClient } from '../api/client';

export default function Register({ onRegistered }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await GameClient.register(username, password);
      if (res && res.success) {
        alert('Registered. You may now log in.');
        onRegistered && onRegistered();
      } else {
        alert(res.error || 'Registration failed');
      }
    } catch (err) {
      alert(err?.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h3>Register</h3>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-row">
          <label>Username</label>
          <input placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="auth-row">
          <label>Password</label>
          <input placeholder="Choose a password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="auth-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        </div>
      </form>
    </div>
  );
}
