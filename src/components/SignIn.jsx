import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Mail } from 'lucide-react';

export default function SignIn() {
  const { sendSignInLink } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      await sendSignInLink(email.trim());
      setStatus('sent');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '2rem', textAlign: 'center' }}>
        <div className="brand-icon" style={{ width: 56, height: 56, margin: '0 auto 1rem' }}>
          <Dumbbell size={28} strokeWidth={2.5} />
        </div>
        <h1 className="brand-name" style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>ParentFit</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Sign in with a link sent to your email. No password.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email" required autoFocus
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn btn-fire btn-full">
            <Mail size={16} /> {busy ? 'Sending...' : 'Send sign-in link'}
          </button>
        </form>
        {status === 'sent' && (
          <p style={{ color: 'var(--teal)', fontSize: '0.85rem', marginTop: '1rem' }}>
            Check <strong>{email}</strong>. Open the link on this device to finish signing in.
          </p>
        )}
        {status === 'error' && (
          <p style={{ color: '#F87171', fontSize: '0.85rem', marginTop: '1rem' }}>
            Could not send the link. Check the address and try again.
          </p>
        )}
      </div>
    </div>
  );
}
