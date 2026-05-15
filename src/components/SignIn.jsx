import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Mail } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export default function SignIn() {
  const { sendSignInLink, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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

  const onGoogle = async () => {
    setGoogleBusy(true);
    setStatus(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      // A user closing the popup is not a real error worth alarming them with.
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setStatus('google-error');
      }
    } finally {
      setGoogleBusy(false);
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
          Sign in to track your workouts. New here? Signing in creates your account.
        </p>

        <button
          type="button"
          onClick={onGoogle}
          disabled={googleBusy || busy}
          className="btn btn-full"
          style={{
            background: '#fff', color: '#1f1f1f', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
          }}
        >
          <GoogleIcon /> {googleBusy ? 'Opening Google...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.1rem 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email" required
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy || googleBusy} className="btn btn-fire btn-full">
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
        {status === 'google-error' && (
          <p style={{ color: '#F87171', fontSize: '0.85rem', marginTop: '1rem' }}>
            Google sign-in failed. Try again or use the email link.
          </p>
        )}
      </div>
    </div>
  );
}
