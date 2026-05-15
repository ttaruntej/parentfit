import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldAlert } from 'lucide-react';

const COLORS = ['#FF6B35', '#00C896', '#A78BFA', '#60A5FA', '#F87171'];

export default function ProfileSetup() {
  const { addProfile, isAdmin } = useApp();
  const { signOut, user } = useAuth();
  const [name, setName] = useState('');
  const [emails, setEmails] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // A signed-in person who is not the admin and has no profile assigned to
  // their email cannot create one — only the admin manages access.
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: 380, padding: '2rem', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <ShieldAlert size={24} color="#F87171" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.5rem' }}>No data for this account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{user?.email}</strong> is
            not on the access list for any profile.
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
            Ask the administrator to grant your email access, then sign in again.
          </p>
          <button type="button" onClick={signOut} className="btn btn-ghost btn-full" style={{ fontSize: '0.8rem' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'profile';
      const initials = name.split(/\s+/).map((w) => w[0]?.toUpperCase() || '').slice(0, 2).join('') || 'P';
      const allowedEmails = emails.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      await addProfile({ slug, name: name.trim(), initials, color, allowedEmails });
    } catch (e) {
      console.error(e);
      setErr('Could not create profile. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 380, padding: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', marginBottom: '0.4rem' }}>Create a profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Each member gets their own profile. Add the emails allowed to see it — you can change them later from Settings.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
              Member name
            </label>
            <input
              type="text" required autoFocus
              className="input"
              placeholder="e.g. Thadana Apparao"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
              Allowed emails
            </label>
            <input
              type="text"
              className="input"
              placeholder="thadanapparao@gmail.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>
              Comma-separated. These accounts (plus you, the admin) can see this profile.
            </p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
              Accent color
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  }}
                  aria-label={`Pick ${c}`}
                />
              ))}
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn btn-fire btn-full" style={{ marginTop: '0.5rem' }}>
            {busy ? 'Creating...' : 'Create profile'}
          </button>
          {err && (
            <p style={{ color: '#F87171', fontSize: '0.85rem', textAlign: 'center' }}>{err}</p>
          )}
        </form>
        <button
          type="button"
          onClick={signOut}
          className="btn btn-ghost btn-full"
          style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
