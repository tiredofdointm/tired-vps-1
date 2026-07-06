import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { User } from '../lib/types';
import { useApp } from '../lib/store';
import { IcZap } from '../lib/icons';

export function SignInPage() {
  const { setUser, toast, refreshNotifications } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const url = mode === 'signin' ? '/api/auth/signin' : '/api/auth/register';
      const { user } = await api.post<{ user: User }>(url, { email, password, name });
      setUser(user);
      refreshNotifications();
      toast(`Welcome back, ${user.name}`, 'ok');
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card glass" onSubmit={submit}>
        <div>
          <span className="pill-note"><IcZap size={13} /> {mode === 'signin' ? 'Welcome back' : 'Join the collective'}</span>
          <h1 style={{ marginTop: 10 }}>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
        </div>
        {mode === 'register' && (
          <div className="field">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Night Owl" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@night.city" autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div style={{ color: 'var(--bad)', fontSize: 13.5, fontWeight: 600 }}>{error}</div>}
        <button className="btn primary lg" type="submit" disabled={busy}>
          {busy ? <span className="spin" /> : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => setMode((m) => (m === 'signin' ? 'register' : 'signin'))}>
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
        <div className="faint" style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.7 }}>
          Demo host — <span className="mono">tiredofdointm@gmail.com</span> / <span className="mono">tired123</span>
          <br />
          Demo client — <span className="mono">guest@tired.events</span> / <span className="mono">guest123</span>
        </div>
      </form>
    </div>
  );
}
